let fallback;
export function feedbackOwner(){try{let id=localStorage.getItem('rr-feedback-owner');if(!id){id=crypto.randomUUID();localStorage.setItem('rr-feedback-owner',id)}return id}catch{return fallback||(fallback=crypto.randomUUID())}}
