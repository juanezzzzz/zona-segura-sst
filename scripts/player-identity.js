/* ============================================
   ZONA SEGURA · Identidad global del jugador
   ============================================
   Antes, cada módulo (ej. Zona Segura SENA) pedía por
   su cuenta el nombre y la función del participante.
   Ahora ese dato se captura una sola vez, al comienzo
   del recorrido (introduccion.html), y queda disponible
   para todos los módulos a través de este pequeño store
   en localStorage.

   Uso:
     PlayerIdentity.get()          -> { name, role }
     PlayerIdentity.set(name, role) -> guarda y devuelve { name, role }
     PlayerIdentity.isComplete()   -> true si ya hay nombre y función
     PlayerIdentity.reset()        -> borra el dato guardado
   ============================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'zonaSegura_playerIdentity';

  function emptyIdentity() {
    return { name: '', role: '' };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyIdentity();
      const parsed = JSON.parse(raw);
      return {
        name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
        role: typeof parsed.role === 'string' ? parsed.role.trim() : '',
      };
    } catch (error) {
      console.warn('No se pudo leer la identidad guardada:', error);
      return emptyIdentity();
    }
  }

  function write(identity) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    } catch (error) {
      console.warn('No se pudo guardar la identidad del jugador:', error);
    }
  }

  function get() {
    return read();
  }

  function set(name, role) {
    const identity = {
      name: (name || '').trim(),
      role: (role || '').trim(),
    };
    write(identity);
    return identity;
  }

  function isComplete() {
    const identity = read();
    return identity.name.length > 0 && identity.role.length > 0;
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* noop */
    }
  }

  window.PlayerIdentity = {
    STORAGE_KEY,
    get,
    set,
    isComplete,
    reset,
  };
})();
