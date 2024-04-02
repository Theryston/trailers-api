import { google as Google } from 'googleapis';

export default async function google(term) {
    const customSearch = Google.customsearch('v1');

    const res = await customSearch.cse.list({
        key: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: term,
    })

    return res.data.items;
}