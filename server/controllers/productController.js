const natural = require("natural");
const { removeStopwords } = require("stopword");
const productModel = require("../models/productModel");
const userint = require('../models/userinteractionModel')
const mongoose = require('mongoose')

// get single product
const singleproduct = async (req, res) => {
    const { query } = req.query;//===================>>need to check and need to add userId thing
    try {
        const item = await productModel.findOne({ productId: query });
        if (!item) {
            throw new Error('Product not found');
        }
        res.status(200).json(item);
        // have to placed before sending the response
        // const interaction = userint.create({ productId: productId, type: 'click', interactionScore: 3 })
        // await interaction.save();
        // console.log('Interaction logged successfully!');
    }
    catch (error) {
        res.status(500).json({ error: 'Something went wrong', details: error.message });
    }
};

// get list of products based on search
const searchproducts = async (req, res) => {
    try {
        const { query, count } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        // Tokenization & Stopword Removal
        const tokenizer = new natural.WordTokenizer();
        let words = tokenizer.tokenize(query.toLowerCase());
        words = removeStopwords(words);

        // Price Range Extraction
        let searchConditions = [];
        const underMatch = query.match(/under (\d+)/i);
        const aboveMatch = query.match(/above (\d+)/i);
        const rangeMatch = query.match(/(\d+)\s*(to|-)\s*(\d+)/i);

        if (underMatch) {
            const maxPrice = parseInt(underMatch[1]);
            searchConditions.push({ price: { $lte: maxPrice } });
        } else if (aboveMatch) {
            const minPrice = parseInt(aboveMatch[1]);
            searchConditions.push({ price: { $gte: minPrice } });
        } else if (rangeMatch) {
            const minPrice = parseInt(rangeMatch[1]);
            const maxPrice = parseInt(rangeMatch[3]);
            searchConditions.push({ price: { $gte: minPrice, $lte: maxPrice } });
        }

        // Full-Text Search with Cleaned Query
        const cleanedQuery = words.join(" ");
        let wordResults = [];

        // For each word, get matching products
        for (const word of words) {
            const results = await productModel.find({
            $and: [
                { $text: { $search: word } },
                ...searchConditions
            ]
            }).select('_id'); // Only fetch _id for intersection
            wordResults.push(results.map(r => r._id.toString()));
        }

        // Find intersection of all result sets
        let intersectedIds = wordResults.length > 0
            ? wordResults.reduce((a, b) => a.filter(id => b.includes(id)))
            : [];

        // Fetch full product documents for intersected ids
        let mongoResults = [];
        if (intersectedIds.length > 0) {
            mongoResults = await productModel.find({
            _id: { $in: intersectedIds }
            }).limit(parseInt(count));
        }

        // // If no results from full-text search, try regex-based fuzzy matching
        // if (mongoResults.length === 0) {
        //     let regexQuery = {
        //         $or: [
        //             { productDisplayName: { $regex: cleanedQuery, $options: "i" } },
        //             { masterCategory: { $regex: cleanedQuery, $options: "i" } },
        //             { subCategory: { $regex: cleanedQuery, $options: "i" } },
        //             { baseColor: { $regex: cleanedQuery, $options: "i" } }
        //         ]
        //     };

        //     mongoResults = await productModel.find({
        //         $and: [regexQuery, ...searchConditions]
        //     }).limit(parseInt(count));
        // }

        return res.status(200).json(mongoResults);
    } catch (error) {
        return res.status(500).json({ error: "Something went wrong", details: error.message });
    }

};



module.exports = {
    singleproduct,
    searchproducts
}
// post to cart