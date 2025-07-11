// api/words.js (FINAL, CORRECTED VERSION using REGEX)

import { MongoClient } from 'mongodb';

// This function escapes special characters for use in a regular expression
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
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
      // --- REGEX Search Logic ---
      // This creates a case-insensitive regular expression to find the search term anywhere
      const searchRegex = new RegExp(escapeRegExp(search), 'i'); 
      
      // The $or operator finds documents that match ANY of the conditions inside the array.
      // We are searching for the regex pattern in the 'bangla', 'japanese', and 'english' fields.
      query = { 
        $or: [
          { bangla: { $regex: searchRegex } },
          { japanese: { $regex: searchRegex } },
          { english: { $regex: searchRegex } }
        ]
      };
      // For regex, alphabetical sort is more predictable than relevance score.
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else if (lesson) {
      // --- Lesson Logic ---
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else {
      // --- All Words Logic (for homepage) ---
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