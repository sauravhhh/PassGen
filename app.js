/* PassGen logic. Pure functions are exported for headless tests. */
(function(){
'use strict';

var SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  nums: '0123456789',
  syms: '!@#$%^&*()-_=+[]{};:,.<>?/~'
};

function buildCharset(opts){
  var s = '';
  if(opts.upper) s += SETS.upper;
  if(opts.lower) s += SETS.lower;
  if(opts.nums)  s += SETS.nums;
  if(opts.syms)  s += SETS.syms;
  return s;
}

function selectedSets(opts){
  var a = [];
  if(opts.upper) a.push(SETS.upper);
  if(opts.lower) a.push(SETS.lower);
  if(opts.nums)  a.push(SETS.nums);
  if(opts.syms)  a.push(SETS.syms);
  return a;
}

function defaultRand(n){
  var buf = new Uint32Array(n);
  (window.crypto || window.msCrypto).getRandomValues(buf);
  return buf;
}

/* Generate a password of `length` chars. Guarantees at least one char from
   each selected set. randFn(n) returns an array-like of n uint32 values. */
function generatePassword(length, opts, randFn){
  var sets = selectedSets(opts);
  if(sets.length === 0) return '';
  var charset = buildCharset(opts);
  var rand = randFn || defaultRand;
  var need = Math.min(length, sets.length);
  var idx = rand(length);
  var out = new Array(length);
  var i, j;
  /* First, place one guaranteed char from each selected set. */
  for(i = 0; i < need; i++){
    var set = sets[i];
    out[i] = set[idx[i] % set.length];
  }
  /* Fill the rest from the full charset. */
  for(i = need; i < length; i++){
    out[i] = charset[idx[i] % charset.length];
  }
  /* Shuffle so guaranteed chars are not always at the front. */
  for(i = length - 1; i > 0; i--){
    j = idx[i] % (i + 1);
    var t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out.join('');
}

/* Entropy in bits, and a human label. */
function strengthBits(length, charsetSize){
  if(charsetSize < 2 || length < 1) return 0;
  return length * Math.log(charsetSize) / Math.log(2);
}
function strengthLabel(bits){
  if(bits < 40) return 'Weak';
  if(bits < 60) return 'Fair';
  if(bits < 80) return 'Strong';
  return 'Very strong';
}
function strengthColor(label){
  var cs = getComputedStyle(document.documentElement);
  if(label === 'Weak') return '#dc2626';
  if(label === 'Fair') return '#d97706';
  if(label === 'Strong') return '#16a34a';
  return '#16a34a';
}

/* ---- UI wiring (browser only) ---- */
if(typeof window !== 'undefined' && typeof document !== 'undefined'){
  var $ = function(id){ return document.getElementById(id); };
  var pwdEl=$('pwd'), lenEl=$('len'), lenVal=$('lenval'),
      sbar=$('sbar'), slabel=$('slabel'),
      toast=$('toast'), toastT=null;

  function opts(){
    return {
      upper: $('upper').checked, lower: $('lower').checked,
      nums: $('nums').checked, syms: $('syms').checked
    };
  }
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toast.classList.remove('show'); }, 1600);
  }
  function refresh(){
    var o = opts();
    var len = parseInt(lenEl.value, 10);
    lenVal.textContent = len;
    var charset = buildCharset(o);
    if(!charset){
      pwdEl.textContent = 'Select at least one character set';
      sbar.style.width = '0'; slabel.textContent = '—';
      return;
    }
    var p = generatePassword(len, o);
    pwdEl.textContent = p;
    var bits = strengthBits(len, charset.length);
    var label = strengthLabel(bits);
    slabel.textContent = label;
    sbar.style.width = Math.min(100, Math.round(bits / 128 * 100)) + '%';
    sbar.style.background = strengthColor(label);
  }
  $('gen').addEventListener('click', refresh);
  lenEl.addEventListener('input', refresh);
  ['upper','lower','nums','syms'].forEach(function(id){
    $(id).addEventListener('change', refresh);
  });
  $('copy').addEventListener('click', function(){
    var t = pwdEl.textContent;
    if(!t) return;
    function done(){ showToast('Copied'); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(done, function(){ fallback(); });
    } else { fallback(); }
    function fallback(){
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); done(); }catch(e){ showToast('Copy failed'); }
      document.body.removeChild(ta);
    }
  });
  refresh();
}

/* Export for headless tests. */
if(typeof module !== 'undefined' && module.exports){
  module.exports = { SETS: SETS, buildCharset: buildCharset,
    generatePassword: generatePassword, strengthBits: strengthBits,
    strengthLabel: strengthLabel };
}
})();
