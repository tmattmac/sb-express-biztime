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

/** Test companies routes */

describe('GET /companies', () => {
    test('Returns an array with one company', async () => {
        const resp = await request(app).get('/companies');
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            'companies': [{
                name: TEST_COMPANY.name,
                code: TEST_COMPANY.code
            }]
        });
    });
    test('Returns an array with no company', async () => {
        clearDB();
        const resp = await request(app).get('/companies');
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({ 'companies': []});
    });
});

describe('GET /companies/:code', () => {
    test('Returns a single company', async () => {
        const resp = await request(app).get(`/companies/${TEST_COMPANY.code}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            'company': {
                'invoices': [{
                    id: TEST_INVOICE.id,
                    amt: TEST_INVOICE.amt
                }],
                'industries': [],
                'name': TEST_COMPANY.name,
                'code': TEST_COMPANY.code
            }
        });
    });
    test('Returns 404 for non-existent company', async () => {
        const resp = await request(app).get('/companies/fail');
        expect(resp.statusCode).toBe(404);
    });
});

describe('POST /companies', () => {
    test('Valid company posts successfully', async () => {
        const newCompany = {
            name: 'New Company',
            description: 'Unknown'
        }
        const resp = await request(app)
            .post(`/companies`)
            .send(newCompany);
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toMatchObject({
            company: {
                code: expect.any(String),
                ...newCompany
            }
        });
    });

    test('Invalid company does not post successfully', async () => {
        const newCompany = {
            description: 'Unknown'
        }
        const resp = await request(app)
            .post(`/companies`)
            .send(newCompany);
        expect(resp.statusCode).toBe(500);
    });

    test('Duplicate company does not post successfully', async () => {
        const resp = await request(app)
            .post(`/companies`)
            .send(TEST_COMPANY);
        expect(resp.statusCode).toBe(500);
    });
});

describe('PUT /companies/:code', () => {
    test('Update a company successfully', async () => {
        const newData = { 
            name: 'New Name',
            description: 'Updated description'
        }
        const resp = await request(app)
            .put(`/companies/${TEST_COMPANY.code}`)
            .send(newData);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toMatchObject({
            company: {
                code: TEST_COMPANY.code,
                ...newData
            }
        });
    });

    test('Updating non-existent company returns 404', async () => {
        const newData = { 
            name: 'New Name',
            description: 'Updated description'
        }
        const resp = await request(app)
            .put(`/companies/fail`)
            .send(newData);
        expect(resp.statusCode).toBe(404);  
    });
});

describe('DELETE /companies/:code', () => {
    test('Delete a company successfully', async () => {
        const resp = await request(app).delete(`/companies/${TEST_COMPANY.code}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ status: 'deleted' });

        const resp2 = await request(app).get('/companies');
        expect(resp2.body).toMatchObject({ companies: [] });
    });

    test('Deleting non-existent company returns 404', async () => {
        const resp = await request(app).delete(`/companies/fail`);
        expect(resp.statusCode).toBe(404); 
    });
});