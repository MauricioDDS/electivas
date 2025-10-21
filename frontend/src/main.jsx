import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home";
import Login from "./components/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/ProtectedRoute";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(regs => {
      regs.forEach(reg => {
        try {
          reg.unregister().then(ok => {
            console.log('SW unregistered:', ok, reg);
            // también borrar caches
            caches.keys().then(keys => {
              keys.forEach(k => caches.delete(k));
            });
          });
        } catch (e) { console.warn('unregister sw failed', e); }
      });
    })
    .catch(e => console.warn('no SW regs', e));
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
