package com.hulldrapro.pokeprecio;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Widget de la pantalla de inicio: valor de la colección (lo calcula la app y lo deja en Preferences → "widget"). */
public class ValorWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        for (int id : ids) pintar(ctx, m, id);
    }

    static void pintar(Context ctx, AppWidgetManager m, int id) {
        SharedPreferences cap = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String total = "—", local = "", n = "", fecha = "";
        try {
            JSONObject w = new JSONObject(cap.getString("widget", "{}"));
            total = w.optString("total", "—"); local = w.optString("local", "");
            n = w.optString("n", ""); fecha = w.optString("fecha", "");
        } catch (Exception ignored) { }
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_valor);
        v.setTextViewText(R.id.w_total, total);
        v.setTextViewText(R.id.w_local, local);
        v.setTextViewText(R.id.w_n, n + (fecha.isEmpty() ? "" : " · " + fecha));
        Intent abrir = new Intent(ctx, MainActivity.class);
        v.setOnClickPendingIntent(R.id.w_raiz, PendingIntent.getActivity(ctx, 0, abrir, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        m.updateAppWidget(id, v);
    }

    public static void actualizarTodos(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] ids = m.getAppWidgetIds(new ComponentName(ctx, ValorWidget.class));
        for (int id : ids) pintar(ctx, m, id);
    }
}
