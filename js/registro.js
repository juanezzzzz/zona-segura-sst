/* Registro del participante */
(function () {
  'use strict';
  const { store, ui, journey } = window.ZS;
  if (!journey.mount('registro')) return;

  const form = document.getElementById('reg-form');
  const nameIn = document.getElementById('name');
  const otherWrap = document.getElementById('role-other-wrap');
  const otherIn = document.getElementById('role-other');
  const nameErr = document.getElementById('name-error');
  const roleErr = document.getElementById('role-error');
  const cName = document.getElementById('c-name');
  const cRole = document.getElementById('c-role');
  const cPhoto = document.getElementById('c-photo');
  const PHOTO_SVG = cPhoto.innerHTML;

  document.getElementById('c-date').textContent = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const LETTERS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
  const clean = (v) => v.replace(/\s+/g, ' ').trim();

  function selectedRole() {
    const r = form.querySelector('input[name="role"]:checked');
    if (!r) return '';
    return r.value === 'otro' ? clean(otherIn.value) : r.value;
  }

  function nameError(v) {
    if (!v) return 'Escribe tu nombre para continuar.';
    if (v.length < 2) return 'El nombre debe tener al menos 2 letras.';
    if (!LETTERS.test(v)) return 'Usa solo letras y espacios.';
    return '';
  }

  function roleError(v) {
    if (!form.querySelector('input[name="role"]:checked')) return 'Elige tu rol.';
    if (!v) return 'Escribe tu rol.';
    if (!LETTERS.test(v)) return 'Usa solo letras y espacios.';
    return '';
  }

  function showError(el, input, msg) {
    el.hidden = !msg;
    el.textContent = msg ? '⚠ ' + msg : '';
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function paint() {
    const n = clean(nameIn.value);
    const r = selectedRole();
    cName.textContent = n || 'Tu nombre';
    cName.classList.toggle('is-empty', !n);
    cRole.textContent = r || 'Rol';
    cRole.classList.toggle('is-empty', !r);
    if (n) cPhoto.textContent = n.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('').toUpperCase();
    else cPhoto.innerHTML = PHOTO_SVG;
  }

  nameIn.addEventListener('input', () => {
    paint();
    if (nameIn.getAttribute('aria-invalid') === 'true') showError(nameErr, nameIn, nameError(clean(nameIn.value)));
  });
  nameIn.addEventListener('blur', () => { if (nameIn.value) showError(nameErr, nameIn, nameError(clean(nameIn.value))); });

  form.addEventListener('change', (e) => {
    if (e.target.name !== 'role') return;
    otherWrap.hidden = e.target.value !== 'otro';
    if (!otherWrap.hidden) otherIn.focus();
    showError(roleErr, null, '');
    paint();
  });
  otherIn.addEventListener('input', paint);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = clean(nameIn.value);
    const r = selectedRole();
    const ne = nameError(n);
    const re = roleError(r);
    showError(nameErr, nameIn, ne);
    showError(roleErr, otherWrap.hidden ? null : otherIn, re);
    if (ne) { nameIn.focus(); return; }
    if (re) { (otherWrap.hidden ? form.querySelector('input[name="role"]') : otherIn).focus(); return; }
    store.setPlayer(n, r);
    ZS.sfx.correct();
    window.location.href = journey.href('epp.html');
  });

  paint();
  nameIn.focus();
})();
