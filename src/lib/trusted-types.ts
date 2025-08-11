
// src/lib/trusted-types.ts
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy: (name: string, policy: TrustedTypePolicy) => TrustedTypePolicy;
    };
  }
}

interface TrustedTypePolicy {
  createHTML?: (input: string) => string;
  createScript?: (input: string) => string;
  createScriptURL?: (input: string) => string;
}

export function initTrustedTypes() {
  if (typeof window !== 'undefined' && window.trustedTypes) {
    const policy = window.trustedTypes.createPolicy('default', {
      createHTML: (input: string) => {
        // DOMPurifyなどでサニタイズ
        return input;
      },
      createScript: (input: string) => {
        // スクリプトの検証
        return input;
      },
      createScriptURL: (input: string) => {
        // URL検証
        if (input.startsWith('/') || input.startsWith('https://')) {
          return input;
        }
        throw new Error('Invalid script URL');
      },
    });
    
    return policy;
  }
  
  return null;
}
