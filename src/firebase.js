import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
// Public Firebase web configuration. Authorization is enforced by Firebase rules.
const app=initializeApp({projectId:'draw-the-play-football',appId:'1:541505169124:web:5f9ce74fa9d578b2f92ef1',apiKey:'AIzaSyBsV5g18c8dgQSUN2rcjJkZvHBiJ028_g0',authDomain:'draw-the-play-football.firebaseapp.com'});
export const auth=getAuth(app);
export const db=getFirestore(app);
auth.useDeviceLanguage();
