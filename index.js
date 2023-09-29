

const fetch = require('node-fetch');
const crypto = require('crypto');

// Public encryption keys are hosted on a CDN.
const PUBLIC_ENCRYPTION_KEYS_URL = "https://checkout.clover.com/assets/keys.json";
const PREFIX_ID = "00000000";

// Production: https://api.clover.com" - Sandbox: https://apisandbox.dev.clover.com
const BASE_URL = "https://apisandbox.dev.clover.com";
// Production: https://token.clover.com/v1/tokens - Sandbox: https://token-sandbox.dev.clover.com/v1/tokens
const TOKEN_URL = "https://token-sandbox.dev.clover.com/v1/tokens";
const ACCESS_TOKEN = "{put_your_access_token_here}";

// Test Credit Card Info
const CC_NUMBER = "6011361000006668";
const CVV_NUMBER = "123";
const EXP_MONTH = "07";
const EXP_YEAR = "2030";

const main = async () => {
    try {
        testTokenize();    
    } catch (error) {
        console.log(error);
    }
    
};

const testTokenize = async () => {
    console.log("Get PAKMS");
    const pakmsResponse = await sendGet(BASE_URL, "/pakms/apikey", true);
    const pakms = pakmsResponse.apiAccessKey

    console.log("Get Public Encryption Key from CDN ...");
    const keysResponse = await sendGet(PUBLIC_ENCRYPTION_KEYS_URL, "", false);
    const taPublicKey = keysResponse.TA_PUBLIC_KEY_PROD;

    const ccEncrypted = encryptPAN(CC_NUMBER, taPublicKey);

    const tokenRequest = {
        card: {
            encypted_pan: ccEncrypted,
            exp_month: EXP_MONTH,
            exp_year: EXP_YEAR,
            first6: CC_NUMBER.substring(0, 6),
            last4: CC_NUMBER.substring(CC_NUMBER.length() - 4),
            cvv: CVV_NUMBER
        }
    };
    

    const tokenResponse = await sendTokenPost(pakms, tokenRequest);
    console.log(tokenResponse);

    if(tokenResponse.id) {
        console.log(`Your card token, pass this token in payment requests: ${tokenResponse.id}`);
    } else {
        console.log("An invalid token response was returned.");
    }

}

const sendGet = async (baseUrl, endpoint, bearerRequired) => {
    const requestOptions = bearerRequired ? {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ACCESS_TOKEN}` 
        }
    } : {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json'
        }
    };

    const res = await fetch(baseUrl + endpoint, requestOptions);
    return await res.json();
}

const sendTokenPost = async (pakms, jsonObject) => {
    const jsonString = JSON.stringify(jsonObject);
    console.log(`Posting: ${jsonString}`);

    const requestOptions = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'apiKey': pakms 
        },
        body: jsonString
    };

    const res = await fetch(TOKEN_URL, requestOptions);
    return await res.json()
}

const encryptPAN = (pan, taPublicKey) => {
    let buf = Buffer.from(taPublicKey, "base64");
    const input = PREFIX_ID + pan;
    const publicKey = crypto.createPublicKey({
        key: {
            n: Buffer.from("00", "hex") + buf.subarray(0, 256),
            e: buf.subarray(256, 512)
        }
    });

    const encryptedBuffer = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, 
        oaepHash: "sha1"
    }, Buffer.from(input));

    const encryptedData = encryptedBuffer.toString("base64");
    return encryptedData;
}