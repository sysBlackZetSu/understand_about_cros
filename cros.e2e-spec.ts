import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('CORS Domain Specific (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.enableCors({
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'https://subdomain.example.com',
                    'https://www.example.com'
                ];

                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            allowedHeaders: 'Content-Type,Authorization',
        });
        await app.init();
    });

    it('should allow requests from allowed domain', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/resource')
            .set('Origin', 'https://www.example.com')
            .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe('https://www.example.com');
    });

    it('should reject requests from disallowed domain', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/resource')
            .set('Origin', 'http://disallowed-domain.com')
            .expect(500);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow requests from subdomain', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/resource')
            .set('Origin', 'https://subdomain.example.com')
            .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe('https://subdomain.example.com');
    });

    it('should reject requests from non-subdomain', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/v1/resource')
            .set('Origin', 'https://otherdomain.com')
            .expect(500);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle preflight request with allowed origin', async () => {
        const response = await request(app.getHttpServer())
            .options('/api/v1/resource')
            .set('Origin', 'https://www.example.com')
            .set('Access-Control-Request-Method', 'GET')
            .expect(204);

        expect(response.headers['access-control-allow-origin']).toBe('https://www.example.com');
        expect(response.headers['access-control-allow-methods']).toBe('GET,HEAD,PUT,PATCH,POST,DELETE');
        expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Authorization');
    });

    it('should handle preflight request with disallowed origin', async () => {
        const response = await request(app.getHttpServer())
            .options('/api/v1/resource')
            .set('Origin', 'http://disallowed-domain.com')
            .set('Access-Control-Request-Method', 'GET')
            .expect(500);

        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    afterAll(async () => {
        await app.close();
    });
});
