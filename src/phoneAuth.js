export function normalizePhone(value){
 const digits=value.replace(/[\s().-]/g,'');
 const phone=/^\d{10}$/.test(digits)?'+1'+digits:/^1\d{10}$/.test(digits)?'+'+digits:digits;
 if(!/^\+1[2-9]\d{2}[2-9]\d{6}$/.test(phone))throw Error('Enter a valid US phone number, including area code.');
 return phone;
}
export function authMessage(error){
 return ({'auth/invalid-verification-code':'That code is incorrect. Try again.','auth/code-expired':'That code expired. Request a new one.','auth/session-expired':'That code expired. Request a new one.','auth/too-many-requests':'Too many attempts. Please wait before trying again.','auth/quota-exceeded':'Text sign-in is temporarily unavailable. Please try again later.','auth/invalid-phone-number':'Enter a valid US mobile number.','auth/captcha-check-failed':'Please complete the security check again.','auth/network-request-failed':'Check your connection and try again.','auth/unauthorized-domain':'Phone sign-in is not available on this address. Open playcallfootball.com.','permission-denied':'Your profile could not be saved. Please try again later.'})[error?.code]||'Something went wrong. Please try again.';
}
