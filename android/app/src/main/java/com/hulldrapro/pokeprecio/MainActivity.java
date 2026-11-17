package com.hulldrapro.pokeprecio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // alertas de precio en segundo plano (cada ~6 h, aunque la app esté cerrada)
        AlertasWorker.programar(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        // al salir de la app, el widget muestra el valor más reciente de la colección
        ValorWidget.actualizarTodos(this);
    }
}
