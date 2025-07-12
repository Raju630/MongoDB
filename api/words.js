// api/words.js (FINAL - CORRECTLY DECODES URL PARAMETERS)

import { MongoClient } from 'mongodb';

// This function escapes special characters for use in a regular expression
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(request, response) {
  try {
    await client.connect();
    const db = client.db("n5_dictionary_db");
    const collection = db.collection("words");

    const { lesson, search } = request.query;
    
    let query = {};
    let results = [];

    if (search) {
      // --- THE CRITICAL FIX IS HERE ---
      // We must first decode the search parameter received from the URL.
      const decodedSearch = decodeURIComponent(search);

      // Now, check the DECODED string for commas.
      if (decodedSearch.includes(',')) {
        // This is a list of words from the study session.
        const wordList = decodedSearch.split(',').map(word => word.trim());
        // Use the $in operator to find all documents where 'bangla' is in our list.
        query = { bangla: { $in: wordList } };
        results = await collection.find(query).toArray();

      } else {
        // This is a single-term search from the search bar.
        // Use the decoded search term for the regex as well.
        const searchRegex = new RegExp(escapeRegExp(decodedSearch), 'i'); 
        query = { 
          $or: [
            { bangla: { $regex: searchRegex } },
            { japanese: { $regex: searchRegex } },
            { english: { $regex: searchRegex } }
          ]
        };
        results = await collection.find(query).sort({ bangla: 1 }).toArray();
      }
    
    } else if (lesson) {
      // Lesson logic remains the same
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else {
      // All Words Logic remains the same
      results = await collection.find({}).sort({ bangla: 1 }).toArray();
    }
    
    // Convert the array of documents back into the dictionary object format
    const dictionaryObject = results.reduce((obj, item) => {
        obj[item.bangla] = {
            meaning: item.japanese || '',
            en: item.english || '',
            category: item.category || 'Others',
            lesson: item.lesson || 0
        };
        return obj;
    }, {});

    response.status(200).json(dictionaryObject);

  } catch (error) {
    console.error("API Error:", error);
    response.status(500).json({ error: "API Error: " + error.message });
  } 
}