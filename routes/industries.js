const express = require('express');
const db = require('../db');
const ExpressError = require('../expressError');
const slugify = require('slugify');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await db.query(`
            SELECT i.code, i.industry, ci.comp_code 
            FROM industries i
            LEFT JOIN companies_industries ci
            ON i.code = ci.industry_code
            ORDER BY i.code;
        `);
        const industries = rows.reduce((industries, row) => {
            let last = industries.length - 1;
            if (!industries[last] || industries[last] != row.code) {
                industries.push({
                    code: row.code,
                    industry: row.industry,
                    companies: []
                });
                last++;
            }
            if (row.comp_code) {
                industries[last].companies.push(row.comp_code);
            }
            return industries;
        }, []);
        return res.json({ industries });
    } catch (e) {
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { industry: industryName } = req.body;
        const code = industryName ? slugify(industryName, { lower: true }) : null;
        const { rows: [industry] } = await db.query(`
            INSERT INTO industries
            VALUES ($1, $2)
            RETURNING code, industry;
        `, [code, industryName]);
        return res.status(201).json({ industry });
    } catch (e) {
        return next(e);
    }
});

router.post('/:industryCode', async (req, res, next) => {
    try {
        const { company } = req.body;
        const { industryCode } = req.params;
        await db.query(`
            INSERT INTO companies_industries
            VALUES ($1, $2);
        `, [company, industryCode]);
        return res.status(201).json({
            message: `Industry ${industryCode} added to ${company}` 
        });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;