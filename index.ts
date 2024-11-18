import express, { Request, Response } from 'express';
import axios from 'axios';
import { google } from 'googleapis';

// скажу честно напастил с гпт)))))) обычно данные в монге/постгре/редисе
async function updateGoogleSheet(data: Array<any>) {
    const auth = new google.auth.GoogleAuth({
        keyFile: '',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = ''; // айди таблицы

    const resource = {
        values: [
            ['id', 'firstName', 'lastName', 'gender', 'address', 'city', 'phone', 'email', 'status'], 
            ...data.map(item => Object.values(item)), 
        ],
    };

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'RAW',
        requestBody: {
            values: [
                ['id', 'firstName', 'lastName', 'gender', 'address', 'city', 'phone', 'email', 'status'], // Заголовки столбцов
                ...data.map(item => Object.values(item)), 
            ],
        },
    });

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/view`;
}

//ts moment))) вообще должно быть в другом файле, но мне лень)
interface IClient {
    id: number,
    firstName: string,
    lastName: string,
    gender: string,
    address: string,
    city: string,
    phone: string,
    email: string
}

interface IStatus {
    id: number,
    status: string
}

const app = express();
const api = 'http://94.103.91.4:5000';

app.use(express.json());

app.post('/register', async (req: any, res: any) => {
    const { username } = req.body;

    if (!username) {
        return res.status(418).json({ message: 'Login is required' });
    }

    const response = await axios.post(`${api}/auth/registration`, {
        username
    });

    return res.status(response.status).json(response.data);

});

app.get('/table', async (req: any, res: any) => {
    const { page, limit } = req.query
    const token = req.headers.authorization
    if (!token) {
        return res.status(418).json({ message: 'Token is required' });
    } else if (!page || !limit) {
        return res.status(418).json({ message: 'Page and limit are required' });
    }

    const offset = (page - 1) * limit

    const clients: Array<IClient> = (await axios({
        method: 'get',
        url: `${api}/clients?limit=${limit}&offset=${offset}`,
        headers: {
            Authorization: token
        }
    })).data

    const status: Array<IStatus> = (await axios({
        method: 'post',
        url: `${api}/clients`,
        headers: {
            Authorization: token
        },
        data: {
            // тут айдишники полученные выше, просто мапом идти по клиентам как будто менее производительно
            userIds: Array.from({ length: limit }, (_, i) => i + offset + 1).slice(0, limit) 
        }
    })).data
    // я уверен можно сделать как-то по умному, но как я не смог додуматься
    const mergedArray = clients.map((obj1: IClient) => {
        const obj2 = status.find((obj2: IStatus) => obj2.id === obj1.id);
        return { ...obj1, ...obj2 };
    });



    return updateGoogleSheet(mergedArray)

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

