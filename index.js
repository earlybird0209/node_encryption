
import NodeRSA from 'node-rsa';
const key = new NodeRSA();

import fetch from 'node-fetch';
import { createPublicKey, publicEncrypt, constants } from 'crypto';

// Public encryption keys are hosted on a CDN.
const PUBLIC_ENCRYPTION_KEYS_URL = "https://checkout.clover.com/assets/keys.json";
const PREFIX_ID = "00000000";

const BASE_URL = "https://scl-sandbox.dev.clover.com";
const TOKEN_URL = "https://token-sandbox.dev.clover.com/v1/tokens";
const ACCESS_TOKEN = "23864cda-2d3a-2f2d-a381-1acc2098de95";

// Test Credit Card Info
const CC_NUMBER = "6011361000006668";
const CVV_NUMBER = "123";
const EXP_MONTH = "09";
const EXP_YEAR = "2023";

const main = async () => {
    try {
        await testTokenize();    
    } catch (error) {
        console.log(error);
    }
    
};

const testTokenize = async () => {

    try {
        console.log("Get PAKMS");
        const pakmsResponse = await sendGet(BASE_URL, "/pakms/apikey", true);
        const pakms = pakmsResponse.apiAccessKey

        console.log("Get Public Encryption Key from CDN ...");
        const keysResponse = await sendGet(PUBLIC_ENCRYPTION_KEYS_URL, "", false);
        const taPublicKey = keysResponse.TA_PUBLIC_KEY_DEV;

        const ccEncrypted = encryptPAN(CC_NUMBER, taPublicKey);

        const tokenRequest = {
            card: {
                encrypted_pan: ccEncrypted,
                exp_month: EXP_MONTH,
                exp_year: EXP_YEAR,
                first6: CC_NUMBER.substring(0, 6),
                last4: CC_NUMBER.substring(CC_NUMBER.length - 4),
                cvv: CVV_NUMBER,
                brand: "Discover"
            }
        };
        

        const tokenResponse = await sendTokenPost(pakms, tokenRequest);
        console.log(tokenResponse);

        if(tokenResponse.id) {
            console.log(`Your card token, pass this token in payment requests: ${tokenResponse.id}`);
        } else {
            console.log("An invalid token response was returned.");
        }

    } catch (error) {
        console.log(error)
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
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'apiKey': pakms 
        },
        body: jsonString
    };

    const res = await fetch(TOKEN_URL, requestOptions);
    return await res.json()
}

const encryptPAN = (pan, taPublicKey) => {
    try {
        let buf = Buffer.from(taPublicKey, "base64");
        let input = PREFIX_ID + pan;
        const modulus = buf.subarray(0, 256);
        let modulusHexString = BigInt("0x" + modulus.toString("hex")).toString(16);
        modulusHexString = modulusHexString.length % 2 == 1 ? '0' + modulusHexString : modulusHexString;
        const modulusString = Buffer.from(modulusHexString, 'hex');
        console.log(modulusString.toString('hex'));
        const exponent = buf.subarray(256, 512);
        let exponentHexString = BigInt("0x" + exponent.toString("hex")).toString(16);
        exponentHexString = exponentHexString.length % 2 == 1 ? '0' + exponentHexString : exponentHexString;
        const exponentString = Buffer.from(exponentHexString, 'hex');
        console.log(exponentString.toString('hex'));
        
        const pubKey = key.importKey({ n: modulusString, e: exponentString },"components-public");
        // const publicKey = createPublicKey({
        //     key: ,
        //     format: 'pem',
        //     type: 'pkcs1',

        // });
        const keyString = pubKey.exportKey(['public']);
        const encryptedBuffer = publicEncrypt({
            key: keyString
        }, Buffer.from(input));

        const encryptedData = encryptedBuffer.toString("base64");
        console.log(encryptedData);
        return encryptedData;
    } catch (error) {
        console.log(error)
    }
    
}

main()