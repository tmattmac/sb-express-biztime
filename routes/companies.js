const express = require('express');
const db = require('../db');
const ExpressError = require('../expressError');
const slugify = require('slugify');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { rows: companies } = await db.query(`
            SELECT code, name
            FROM companies;
        `);
        return res.json({ companies });
    } catch (e) {
        return next(e);
    }
});

router.get('/:code', async (req, res, next) => {
    try {
        const code = req.params.code;
        const { rows } = await db.query(`
            SELECT c.code, c.name, c.description,
                i.id, i.amt, i.paid, i.add_date, i.paid_date
            FROM companies c
            LEFT JOIN invoices i
            ON c.code = i.comp_code
            WHERE code = $1;
        `, [code]);
        if (rows.length === 0) {
            throw new ExpressError(`Company with code '${code}' not found`, 404);
        }

        let { rows: industries } = await db.query(`
            SELECT i.industry
            FROM companies c
            LEFT JOIN companies_industries ci
            ON c.code = ci.comp_code
            LEFT JOIN industries i
            ON ci.industry_code = i.code
            WHERE c.code = $1;
        `, [code]);
        if (!industries[0].industry) industries.pop();
        industries = industries.map(row => row.industry);

        let invoices = [];
        if (rows[0].id) {
            invoices = rows.map(row => {
                const { id, amt, paid, add_date, paid_date } = row;
                const output = { id, amt, paid, add_date, paid_date };
                return output;
            });
        }

        const company = {
            code: rows[0].code,
            name: rows[0].name,
            description: rows[0].description,
            invoices,
            industries
        };
        return res.json({ company });
    } catch (e) {
        console.error(e.stack);
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const code = name ? slugify(name, { lower: true }) : null;
        const { rows: [company] } = await db.query(`
            INSERT INTO companies
            VALUES ($1, $2, $3)
            RETURNING code, name, description;
        `, [code, name, description]);
        return res.status(201).json({ company });
    } catch (e) {
        return next(e);
    }
});

router.put('/:code', async (req, res, next) => {
    try {
        const code = req.params.code;
        const { name, description } = req.body;
        const { rows: [company] } = await db.query(`
            UPDATE companies
            SET name = $1, description = $2
            WHERE code = $3
            RETURNING code, name, description;
        `, [name, description, code]);
        if (!company)
            throw new ExpressError(`Company with code '${code}' not found`, 404);
        return res.json({ company });
    } catch (e) {
        return next(e);
    }
});

router.delete('/:code', async (req, res, next) => {
    try {
        const code = req.params.code;
        const { name, description } = req.body;
        const { rows: [company] } = await db.query(`
            DELETE FROM companies
            WHERE code = $1
            RETURNING code;
        `, [code]);
        if (!company)
            throw new ExpressError(`Company with code '${code}' not found`, 404);
        return res.json({ status: 'deleted' });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;