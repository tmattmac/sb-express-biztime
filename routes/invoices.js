const express = require('express');
const db = require('../db');
const ExpressError = require('../expressError');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { rows: invoices } = await db.query(`
            SELECT id, comp_code
            FROM invoices;
        `);
        console.log(invoices);
        return res.json({ invoices });
    } catch (e) {
        return next(e);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows: [invoice] } = await db.query(`
            SELECT id, amt, paid, add_date, paid_date, companies.code, companies.name, companies.description
            FROM invoices
            JOIN companies
            ON invoices.comp_code = companies.code
            WHERE id = $1;
        `, [req.params.id]);
        if (!invoice)
            throw new ExpressError(`Invoice with id '${req.params.id}' not found`, 404);
        const { id, amt, paid, add_date, paid_date, ...company } = invoice;
        const output = { id, amt, paid, add_date, paid_date, company };
        return res.json({ invoice: output });
    } catch (e) {
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;
        const { rows: [invoice] } = await db.query(`
            INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date;
        `, [comp_code, amt]);
        return res.status(201).json({ invoice });
    } catch (e) {
        return next(e);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { amt } = req.body;
        const { rows: [invoice] } = await db.query(`
            UPDATE invoices
            SET amt = $1
            WHERE id = $2
            RETURNING id, comp_code, amt, paid, add_date, paid_date;
        `, [amt, id]);
        if (!invoice)
            throw new ExpressError(`Invoice with id '${id}' not found`, 404);
        return res.json({ invoice });
    } catch (e) {
        return next(e);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { rows: [invoice] } = await db.query(`
            DELETE FROM invoices
            WHERE id = $1
            RETURNING id;
        `, [id]);
        if (!invoice)
            throw new ExpressError(`Invoice with id '${id}' not found`, 404);
        return res.json({ status: 'deleted' });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;