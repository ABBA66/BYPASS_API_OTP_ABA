import express from 'express'
import cors from 'cors'
import bypaddFn from './lib/bypass.mjs'
import formval from './lib/formvalid.mjs';
import multer from 'multer';

const PORT=process.env.PORT || 3000


const app=express()
app.use(express.json())
app.use(express.urlencoded({extended:true}));

const corsOptions = {
    origin: '*', // Replace '*' with your frontend URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions))

const upload = multer();  // Ajout de multer sans stockage car on utilise les données du formulaire en mémoire

app.use(express.static('public'))

app.post('/api/v1/bypass',bypaddFn)
app.post('/vf', upload.none(), async (req, res) => {

    const formData = new Map(Object.entries(req.body));

    try {
        console.log('Données du formulaire reçues:', req.body);
        const otpCode = await formval(formData);
        console.log('Code OTP obtenu:', otpCode);

        res.json({ otpCode });
    } catch (error) {
        console.error('Erreur lors du traitement du formulaire:', error.message);
        res.status(500).json({ error: 'Erreur lors du traitement du formulaire', details: error.message });
    }
});


app.use((error,req,res,next)=>{
    console.log('505 Server error')
})



app.listen(PORT,()=>console.log(`Server running on http://domaine.com:${PORT}`))