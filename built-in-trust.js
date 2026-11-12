/* Chapter 13: immutable in-build trust root. No official pins have been independently reviewed. */
(function(root){'use strict';
const BUILD_PINS=Object.freeze([]);
function authority(){return root.JudgePinAuthority?.createAuthority(BUILD_PINS)||{supported:false,reason:'Autorità non disponibile'}}
function verify(manifest){const a=authority();const check=root.JudgePinAuthority?.authorize(a,manifest);return check?.supported?{supported:true,pin:check.pin}:{supported:false,reason:'Nessun pin approvato nella build'}}
function status(){return {source:'build-controlled',pins:BUILD_PINS.length,officialCorpusAvailable:false,cryptographicPublisherAuthentication:false}}
root.JudgeBuiltInTrust={authority,verify,status};
})(typeof window!=='undefined'?window:globalThis);
