package com.hulldrapro.pokeprecio;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Revisa precios en segundo plano (cada ~6 h, con internet):
 *  - avisa cuando una carta de "Deseos" llega al precio que puso el usuario;
 *  - avisa si una carta de la colección sube o baja más del % elegido en Ajustes.
 * Lee los datos que la app guarda con Capacitor Preferences (grupo "CapacitorStorage").
 */
public class AlertasWorker extends Worker {
    static final String CANAL = "alertas_precio";
    static final String[] ORDEN = { "normal", "holofoil", "reverse-holofoil", "1st-edition-holofoil", "1st-edition-normal", "unlimited-holofoil" };

    public AlertasWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    public static void programar(Context ctx) {
        Constraints c = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(AlertasWorker.class, 6, TimeUnit.HOURS).setConstraints(c).build();
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("alertas_cardcalc", ExistingPeriodicWorkPolicy.KEEP, r);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences cap = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        SharedPreferences mem = ctx.getSharedPreferences("cardcalc_worker", Context.MODE_PRIVATE);
        try {
            JSONObject alertas = new JSONObject(cap.getString("alertas", "{}"));
            if (alertas.optBoolean("on", false)) {
                boolean en = "en".equals(alertas.optString("lang", "es"));
                double eur = alertas.optDouble("eur", 0.92);
                double mov = alertas.optDouble("mov", 0);

                // 1) deseos que llegaron al precio
                JSONArray des = new JSONArray(cap.getString("deseos", "[]"));
                for (int i = 0; i < des.length() && i < 60; i++) {
                    JSONObject d = des.getJSONObject(i);
                    double obj = d.optDouble("objetivoUSD", 0);
                    if (obj <= 0) continue;
                    Double p = precio(d.optString("idioma", "es"), d.optString("id"), d.optString("variante", ""), eur);
                    if (p == null) continue;
                    String k = "d_" + d.optString("key");
                    if (p <= obj) {
                        if (!mem.getBoolean(k, false)) {
                            notificar(ctx, k.hashCode(),
                                (en ? "🎯 At your price: " : "🎯 Llegó a tu precio: ") + d.optString("name"),
                                String.format(Locale.US, en ? "Today US$ %.2f · your price US$ %.2f" : "Hoy US$ %.2f · tu precio US$ %.2f", p, obj));
                            mem.edit().putBoolean(k, true).apply();
                        }
                    } else mem.edit().putBoolean(k, false).apply();
                }

                // 2) cartas de la colección que se movieron más del %
                if (mov > 0) {
                    JSONArray col = new JSONArray(cap.getString("coleccion", "[]"));
                    Set<String> vistos = new HashSet<>();
                    int consultas = 0;
                    for (int i = 0; i < col.length() && consultas < 40; i++) {
                        JSONObject c = col.getJSONObject(i);
                        String id = c.optString("id"), lang = c.optString("idioma", "es");
                        if (!vistos.add(lang + "|" + id)) continue;
                        String k = "c_" + lang + "_" + id;
                        double base = mem.contains(k) ? mem.getFloat(k, 0) : c.optDouble("usd", 0);
                        if (base <= 0) continue;
                        consultas++;
                        Double p = precio(lang, id, c.optString("variante", ""), eur);
                        if (p == null) continue;
                        double pct = (p - base) / base * 100;
                        if (Math.abs(pct) >= mov) {
                            notificar(ctx, k.hashCode(),
                                (pct > 0 ? "📈 " : "📉 ") + c.optString("name") + (en ? (pct > 0 ? " went up " : " went down ") : (pct > 0 ? " subió " : " bajó ")) + String.format(Locale.US, "%.0f%%", Math.abs(pct)),
                                String.format(Locale.US, "US$ %.2f → US$ %.2f", base, p));
                            mem.edit().putFloat(k, (float) (double) p).apply();
                        } else if (!mem.contains(k)) mem.edit().putFloat(k, (float) base).apply();
                    }
                }
            }
        } catch (Exception e) {
            return Result.retry();
        }
        ValorWidget.actualizarTodos(ctx);
        return Result.success();
    }

    /** Precio en US$ como lo calcula la app: TCGplayer (variante guardada o la primera con precio); si no, Cardmarket. */
    static Double precio(String lang, String id, String variante, double eur) {
        try {
            JSONObject carta = new JSONObject(get("https://api.tcgdex.net/v2/" + lang + "/cards/" + id));
            JSONObject pricing = carta.optJSONObject("pricing");
            if (pricing == null) return null;
            JSONObject cm = pricing.optJSONObject("cardmarket");
            if ("ja".equals(lang) && cm != null && cm.optDouble("trend", 0) > 0) return cm.optDouble("trend") / eur;
            JSONObject t = pricing.optJSONObject("tcgplayer");
            if (t != null) {
                JSONObject v = t.optJSONObject(variante);
                if (v != null && v.optDouble("marketPrice", 0) > 0) return v.optDouble("marketPrice");
                for (String k : ORDEN) {
                    JSONObject x = t.optJSONObject(k);
                    if (x != null && x.optDouble("marketPrice", 0) > 0) return x.optDouble("marketPrice");
                }
            }
            if (cm != null && cm.optDouble("trend", 0) > 0) return cm.optDouble("trend") / eur;
        } catch (Exception ignored) { }
        return null;
    }

    static String get(String url) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(15000); h.setReadTimeout(20000);
        try (BufferedReader r = new BufferedReader(new InputStreamReader(h.getInputStream(), "UTF-8"))) {
            StringBuilder s = new StringBuilder(); String l;
            while ((l = r.readLine()) != null) s.append(l);
            return s.toString();
        } finally { h.disconnect(); }
    }

    static void notificar(Context ctx, int id, String titulo, String texto) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Alertas de precio", NotificationManager.IMPORTANCE_DEFAULT);
            ctx.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        Intent abrir = new Intent(ctx, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CANAL)
            .setSmallIcon(R.drawable.ic_stat_cardcalc)
            .setContentTitle(titulo).setContentText(texto)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
            .setContentIntent(pi).setAutoCancel(true);
        try { NotificationManagerCompat.from(ctx).notify(id, b.build()); } catch (SecurityException ignored) { }
    }
}
