import axios from 'axios';
import puppeteer from 'puppeteer';

export default async function formval(formData) {
    const formUrl = formData.get('formUrl');  // Extraction des données
    const emailToSubmit = formData.get('emailToSubmit');
    let otpCode = null;

    try {
        console.log(`Récupération de la page: ${formUrl}`);
        const response = await axios.get(formUrl);
        
        if (response.status === 200) {
            console.log("Page récupérée avec succès.");

            // Extraire le lien d'action et le CSRF
            const { actionUrl, csrfToken } = extractFormDetails(response.data);

            console.log(`Action URL : ${actionUrl}, CSRF Token : ${csrfToken}`);
            
            if (actionUrl && csrfToken) {
                console.log("URL d'action et CSRF trouvés.");

                // Soumettre l'email avec le token CSRF
                otpCode = await submitEmail(actionUrl, csrfToken, emailToSubmit);
            } else {
                console.error("Détails du formulaire non trouvés dans la page.");
                throw new Error("Détails du formulaire non trouvés.");
            }
        } else {
            console.error("Erreur lors de la récupération de la page.");
            throw new Error("Échec de la récupération de la page.");
        }
    } catch (error) {
        console.error('Erreur dans la fonction formval:', error.message);
        throw error;
    }

    return otpCode;
}

// Extraire l'URL d'action et le jeton CSRF
function extractFormDetails(pageContent) {
    const actionUrlRegex = /<form action="([^"]+)"/;
    const csrfTokenRegex = /<input type="hidden" name="csrf_test_name" value="([^"]+)"/;

    const actionMatch = pageContent.match(actionUrlRegex);
    const csrfMatch = pageContent.match(csrfTokenRegex);

    return {
        actionUrl: actionMatch ? actionMatch[1] : null,
        csrfToken: csrfMatch ? csrfMatch[1] : null
    };
}

// Soumettre l'email avec le jeton CSRF
async function submitEmail(actionUrl, csrfToken, email) {
    const browser = await puppeteer.launch({ 
        headless: true ,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log("Accès à la page contenant le formulaire.");
        await page.goto(actionUrl, { waitUntil: 'networkidle2' });

        // Remplir le champ email
        await page.type('input[name="email"]', email);

        // Soumettre le formulaire
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation()
        ]);

        console.log("Formulaire soumis avec succès.");

        const responseText = await page.content();
        const otpCode = responseText.match(/(\d{4,6})/);

        if (otpCode) {
            console.log("Code OTP trouvé : " + otpCode[0]);
            return otpCode[0];
        } else {
            console.log("Aucun code OTP trouvé.");
            return null;
        }
    } catch (error) {
        console.error("Erreur lors de la soumission du formulaire:", error);
        throw error;
    } finally {
        await browser.close();
    }
}
