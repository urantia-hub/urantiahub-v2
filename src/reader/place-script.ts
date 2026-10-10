import { IN_COOKIE } from "@/account/cookies";
import { LAST_READ_KEY } from "./last-read";

// For the contents page and the home page. Runs before the first paint. It says which cards this reader gets, so that the page keeps their room
// and the list below does not move when they arrive. The cards set the same marks after they start.
// A signed-in reader gets the room of "Continue" too: the place can come from the account a moment
// later. Storage can be blocked, so each check stands alone.
export const PLACE_INIT_SCRIPT = `var d=document.documentElement;try{if(localStorage.getItem("${LAST_READ_KEY}"))d.dataset.place=""}catch(e){}try{if(${process.env.NEXT_PUBLIC_SIGN_IN === "on"}){var m=/(^|; )${IN_COOKIE}=1/.test(document.cookie);d.dataset[m?"member":"guest"]="";if(m)d.dataset.place=""}}catch(e){}`;
