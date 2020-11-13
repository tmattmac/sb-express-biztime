process.env.NODE_ENV = 'test';

const app = require('../app');
const db = require('../db');
const request = require('supertest');

let TEST_COMPANY = {
    code: 'test',
    name: 'Test Company',
    description: 'This is but a test'
};

let TEST_INVOICE = {
    comp_code: TEST_COMPANY.code,
    amt: 500
}

const clearDB = async () => {
    await db.query(`DELETE FROM invoices;`);
    await db.query(`DELETE FROM companies;`);
};

beforeAll(clearDB);

beforeEach(async () => {
    let result = await db.query(`
        INSERT INTO companies
        VALUES ($1, $2, $3)
        RETURNING *;
    `, [TEST_COMPANY.code, TEST_COMPANY.name, TEST_COMPANY.description])
    TEST_COMPANY = result.rows[0];

    result = await db.query(`
        INSERT INTO invoices (comp_code, amt)
        VALUES ($1, $2)
        RETURNING *;
    `, [TEST_INVOICE.comp_code, TEST_INVOICE.amt]);
    TEST_INVOICE = result.rows[0];
});

afterEach(clearDB);

afterAll(async () => {
    await db.end();
});

/** Test invoices routes */

describe('GET /invoices', () => {
    test('Returns an array with one invoice', async () => {
        const resp = await request(app).get('/invoices');
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            'invoices': [{
                id: expect.any(Number),
                comp_code: TEST_INVOICE.comp_code
            }]
        });
    });
    test('Returns an array with no invoices', async () => {
        clearDB();
        const resp = await request(app).get('/invoices');
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({ 'invoices': []});
    });
});

describe('GET /invoices/:id', () => {
    test('Returns a single invoice', async () => {
        const resp = await request(app).get(`/invoices/${TEST_INVOICE.id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            'invoice': {
                id: TEST_INVOICE.id,
                amt: TEST_INVOICE.amt,
                paid: TEST_INVOICE.paid,
                company: TEST_COMPANY
            }
        });
    });
    test('Returns 404 for non-existent invoice', async () => {
        const resp = await request(app).get('/invoices/0');
        expect(resp.statusCode).toBe(404);
    });
});

describe('POST /invoices', () => {
    test('Valid company posts successfully', async () => {
        const newInvoice = {
            comp_code: TEST_COMPANY.code,
            amt: 1000
        };
        const resp = await request(app)
            .post(`/invoices`)
            .send(newInvoice);
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toMatchObject({
            invoice: {
                id: expect.any(Number),
                ...newInvoice
            }
        });
    });
});

describe('PUT /invoices/:id', () => {
    test('Update an invoice amount', async () => {
        const newData = { amt: 2000 };
        const resp = await request(app)
            .put(`/invoices/${TEST_INVOICE.id}`)
            .send(newData);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            invoice: {
                id: TEST_INVOICE.id,
                ...newData
            }
        });
    });

    test('Pay an invoice', async () => {
        const newData = { amt: 2000, paid: true };
        const beforeRequest = new Date();
        const resp = await request(app)
            .put(`/invoices/${TEST_INVOICE.id}`)
            .send(newData);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            invoice: {
                id: TEST_INVOICE.id,
                paid_date: expect.any(String),
                ...newData
            }
        });
    });

    test('Un-pay an invoice', async () => {
        const newData = { amt: 2000, paid: false };
        const resp = await request(app)
            .put(`/invoices/${TEST_INVOICE.id}`)
            .send(newData);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            invoice: {
                id: TEST_INVOICE.id,
                paid_date: null,
                ...newData
            }
        });
    });

    test('Updating non-existent invoice returns 404', async () => {
        const newData = { amt: 2000 }
        const resp = await request(app)
            .put(`/invoices/0`)
            .send(newData);
        expect(resp.statusCode).toBe(404);  
    });
});

describe('DELETE /invoices/:id', () => {
    test('Delete an invoice successfully', async () => {
        const resp = await request(app).delete(`/invoices/${TEST_INVOICE.id}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ status: 'deleted' });

        const resp2 = await request(app).get('/invoices');
        expect(resp2.body).toMatchObject({ invoices: [] });
    });

    test('Deleting non-existent invoice returns 404', async () => {
        const resp = await request(app).delete(`/invoices/0`);
        expect(resp.statusCode).toBe(404); 
    });
});