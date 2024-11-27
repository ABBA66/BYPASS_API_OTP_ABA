import axios from 'axios';
import puppeteer from 'puppeteer';

export default async function handler(req, res, next) {
    const { formUrl, emailToSubmit } = req.body;
    let otpCode = null;

    const response = await axios({ method: 'GET', url: formUrl });
    // console.log(`Response Get The form:\n ${response.data}`)

    if (response.status === 200) {
        console.log("Page récupérée avec succès.");

        const cookiesArray = response.headers['set-cookie'] || [];

        // Extraire les détails du formulaire et les cookies
        const { actionUrl, csrfToken, cookies } = extractFormDetails(response.data, cookiesArray);
        //console.log({actionUrl,csrfToken})

        if (actionUrl && csrfToken) {
            console.log("URL d'action trouvée : " + actionUrl);
            console.log("Jeton CSRF trouvé : " + csrfToken);
            console.log("cookies : " + cookies);

            // Soumettre l'email avec le token CSRF
            otpCode = await submitEmail(actionUrl, csrfToken, emailToSubmit, cookies);
        } else {
            console.error("Détails du formulaire non trouvés dans la page.");
            next(new Error("Détails du formulaire non trouvés dans la page."));
        }
    } else {
        console.error("Erreur lors de la récupération de la page.");
        next(new Error("Erreur lors de la récupération de la page."));
    }

    res.json({ otpCode });


}


// Fonction pour extraire l'URL d'action, le jeton CSRF et les cookies
function extractFormDetails(pageContent, cookiesArray) {
    const actionUrlRegex = /<form action="([^"]+)"/;
    const csrfTokenRegex = /<input type="hidden" name="csrf_test_name" value="([^"]+)"/;

    const actionMatch = pageContent.match(actionUrlRegex);
    const csrfMatch = pageContent.match(csrfTokenRegex);

    // Combine tous les cookies dans une seule chaîne
    const cookies = cookiesArray.length > 0 ? cookiesArray.join('; ') : null;

    return {
        actionUrl: actionMatch ? actionMatch[1] : null,
        csrfToken: csrfMatch ? csrfMatch[1] : null,
        cookies: cookies // Les cookies sont renvoyés sous forme de chaîne
    };
}


//Fonction pour soumettre l'email avec le jeton CSRF

async function submitEmail(actionUrl, csrfToken, email, cookies) {
    const formData = `email=${encodeURIComponent(email)}&csrf_test_name=${csrfToken}&action=valContinue`;
    console.log("formData : " + formData);
    try {
        const response = await axios({
            method: "POST",
            url: actionUrl,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36", // Exemple de User-Agent
                "Referer": actionUrl, // Le référant peut être la page où se trouve le formulaire
                "Cookie":  cookies// Si nécessaire
            },
            data: formData,
            withCredentials: true
        });
        if (response.status === 200) {
            console.log("Formulaire soumis avec succès.");

            // Récupérer l'OTP de la réponse  var texta =
            console.log(response.data);
            //const otpCode = extractOtpCode(response.responseText);
            const otpCode = response.data[12] + response.data[13] + response.data[14] + response.data[15];
            if (otpCode) {
                console.log("Code OTP trouvé : " + otpCode);
                return otpCode
            } else {
                console.log("Aucun code OTP trouvé dans la réponse.");
                return;
            }
        } else {
            console.error("Erreur lors de la soumission du formulaire.");
            return ':( pas optCode Erreur lors de la soumission du formulaire.';
        }

        
    } catch (error) {
        console.log(error.message);
        return 'Error de axios'
        
    }
}

// Fonction pour extraire l'OTP de la réponse HTML
function extractOtpCode(responseText) {
    const otpRegex = /Votre OTP est : (\d+)/;  // Ajustez ceci selon la structure réelle de la réponse
    const match = responseText.match(otpRegex);
    return match ? match[1] : null;
}

// async function submitEmail(actionUrl, csrfToken, email) {
//     const browser = await puppeteer.launch({ 
//         executablePath: '..\node_modules\chromium-bidi\.browser',
//         headless: true ,
//         args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });
    
//     const page = await browser.newPage();
    

//     try {
//         // Accéder à la page contenant le formulaire
//         await page.goto(actionUrl,{ waitUntil: 'networkidle2' });

//         // Remplir le champ email
//         await page.type('input[name="email"]', email); // Modifier le sélecteur selon votre formulaire

//         // Remplir le champ CSRF token
//         //await page.type('input[name="csrf_test_name"]', csrfToken); // Modifier le sélecteur selon votre formulaire

//         // Soumettre le formulaire
//         await Promise.all([
//             page.click('button[type="submit"]'), // Modifier le sélecteur selon votre bouton de soumission
//             page.waitForNavigation() // Attendre que la navigation soit terminée
//         ]);

//         console.log("Formulaire soumis avec succès.");

//         // Vérifier la réponse de la page après la soumission
//         const responseText = await page.content(); // Récupérer le contenu de la page
//         console.log(responseText);
//         const otpCode = responseText.match(/(\d{4,6})/);
//         //const otpCode = responseText[12] + responseText[13] + responseText[14] + responseText[15];

//         // Analysez ici le responseText pour extraire l'OTP ou d'autres informations
//         //const otpCode = responseText.match(/(\d{4,6})/); // Exemple de regex pour extraire un code OTP
//         if (otpCode) {
//             console.log("Code OTP trouvé : " + otpCode[0]);
//             return otpCode[0];
//             // Vous pouvez également remplir le champ OTP sur la page si nécessaire
//             //await page.type('#otp', otpCode[0]); // Modifier le sélecteur selon votre champ OTP
//         } else {
//             console.log("Aucun code OTP trouvé dans la réponse.");
//             return
//         }
//     } catch (error) {
//         console.error("Erreur lors de la soumission du formulaire : ", error);
//         return;
//     } finally {
//         await browser.close(); // Fermer le navigateur
//     }
// }



