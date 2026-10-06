const assert=require('assert');
const mgrs=require('./vendor/mgrs-1.0.0.js');
const core=require('./location-core.js');

function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(e){console.error('FAIL',name);throw e;}
}

test('Korean WGS84 round-trips through full 10-digit MGRS',()=>{
  const source=[37.5665,126.9780];
  const encoded=mgrs.forward([source[1],source[0]],5);
  const decoded=core.decodeFull(encoded,mgrs);
  assert(Math.abs(decoded.lat-source[0])<0.001);
  assert(Math.abs(decoded.lon-source[1])<0.001);
  assert.strictEqual(decoded.precision,5);
});

test('spaced and dashed MGRS normalize identically',()=>{
  const encoded=mgrs.forward([127.0276,37.4979],5);
  const p=core.parseFullParts(encoded);
  const spaced=p.zoneBand+' '+p.grid+' '+p.digits.slice(0,5)+' '+p.digits.slice(5);
  const dashed=p.zoneBand+'-'+p.grid+'-'+p.digits.slice(0,5)+'-'+p.digits.slice(5);
  const a=core.decodeFull(spaced,mgrs);
  const b=core.decodeFull(dashed,mgrs);
  assert(core.haversineKm([a.lat,a.lon],[b.lat,b.lon])<0.01);
});

test('10 coordinate digits use exactly the supplied working-grid prefix',()=>{
  const source=[37.5665,126.9780];
  const encoded=mgrs.forward([source[1],source[0]],5);
  const parts=core.parseFullParts(encoded);
  const decoded=core.decodeShort(parts.digits,parts.compactPrefix,mgrs);
  assert.strictEqual(decoded.compactPrefix,parts.compactPrefix);
  assert(core.haversineKm(source,[decoded.lat,decoded.lon])<0.2);
});

test('a wrong regional prefix produces a clearly distant point that callers can reject',()=>{
  const seoul=[37.5665,126.9780];
  const seoulParts=core.parseFullParts(mgrs.forward([seoul[1],seoul[0]],5));
  const tokyoParts=core.parseFullParts(mgrs.forward([139.6917,35.6895],5));
  const wrong=core.decodeShort(seoulParts.digits,tokyoParts.compactPrefix,mgrs);
  assert(core.haversineKm(seoul,[wrong.lat,wrong.lon])>165);
});

test('odd or malformed coordinate-like input is rejected instead of becoming address search',()=>{
  for(const value of ['52S CG 42505 4871','52S CI 42505 48712','425054871','91S CG 42505 48712']){
    assert.throws(()=>core.validateCoordinateLike(value));
  }
});

test('WGS84 parsing is strict about latitude and longitude ranges',()=>{
  assert.deepStrictEqual(core.parseWgs84('37.5665, 126.9780'),{lat:37.5665,lon:126.978,source:'WGS84'});
  assert.throws(()=>core.parseWgs84('126.9780, 37.5665'),/INVALID_WGS84/);
});

console.log('Coordinate parser regression checks complete.');
