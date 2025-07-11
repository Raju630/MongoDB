// api/words.js

import { MongoClient } from 'mongodb';

// Retrieve the secret connection string from Vercel's Environment Variables
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// This is the main API function
export default async function handler(request, response) {
  try {
    await client.connect();
    const db = client.db("n5_dictionary_db");
    const collection = db.collection("words");

    // Get the query parameters from the URL (?lesson=5 or ?search=term)
    const { lesson, search } = request.query;
    
    let query = {};
    let results = [];

    if (lesson) {
      // If a lesson ID is provided, find all words for that lesson
      query = { lesson: parseInt(lesson, 10) };
      results = await collection.find(query).sort({ bangla: 1 }).toArray();
    
    } else if (search) {
      // If a search term is provided, perform a text search
      // The $text operator uses the text index we created in the seeder
      query = { $text: { $search: search } };
      results = await collection.find(query).toArray();
    
    } else {
        // If no parameters, get all words (for the homepage)
        query = {};
        results = await collection.find(query).sort({ bangla: 1 }).toArray();
    }
    
    // Convert the array of documents back into the dictionary object format
    // that the front-end expects.
    const dictionaryObject = results.reduce((obj, item) => {
        obj[item.bangla] = {
            meaning: item.japanese,
            en: item.english,
            category: item.category,
            lesson: item.lesson
        };
        return obj;
    }, {});

    // Send the successful response
    response.status(200).json(dictionaryObject);

  } catch (error) {
    console.error("API Error:", error);
    response.status(500).json({ error: "Failed to connect to the database or fetch data." });
  } 
  // We don't call client.close() here in serverless functions,
  // as Vercel manages connection pooling for better performance.
}