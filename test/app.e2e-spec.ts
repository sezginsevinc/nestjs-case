import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { jwtDecode } from 'jwt-decode';


describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;


  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    const dto = {
      email: 'test@mail.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe'
    };

    describe('POST /auth/register', () => {
      it('should return 400 if no email provided', async () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...dto,
            email: undefined
          })
          .expect(400);
      });

      it('should return 400 if no password provided', async () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...dto,
            password: undefined
          })
          .expect(400);
      });

      it('should return 400 if password empty', async () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...dto,
            password: ''
          })
          .expect(400);
      });

      it('should return 400 if email empty', async () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...dto,
            email: ''
          })
          .expect(400);
      });

      it('should return 201', async () => {
        return await request(app.getHttpServer())
          .post('/auth/register')
          .send(dto)
          .expect(201);
      });
    });

    describe('POST /auth/login', () => {
      const loginDto = {
        email: dto.email,
        password: dto.password
      };

      it('should return 400 if no body provided', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .expect(400);
      });
      it('should return 200 with token', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(200);

        expect(response.body).toHaveProperty('access_token');
        accessToken = response.body.access_token;
      });
    });
  });

  describe('UserPromotion', () => {
    describe('GET /user-promotion', () => {

      it('should return 401 if no token provided', async () => {
        return request(app.getHttpServer())
          .get('/user-promotion')
          .expect(401);
      });

      it('should return 401 if invalid token provided', async () => {
        return request(app.getHttpServer())
          .get('/user-promotion')
          .set('Authorization', `Bearer invalid_token`)
          .expect(401);
      });

      it('should return 200 with list', async () => {
        const response = await request(app.getHttpServer())
          .get('/user-promotion')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });

    describe('GET /user-promotion/:id', () => {

      it('should return 400 if not assigned logged user', async () => {
        const newUserPromotion = await prisma.userPromotion.create({
          data: {
            promotion: {
              create: {
                title: 'test',
                startDate: new Date(),
                endDate: new Date(),
                carrier: {
                  create: {
                    name: 'test'
                  }
                },
                discount: 10
              }
            },
            user: {
              create: {
                email: 'userPromotion@mail.com',
                firstName: 'John',
                lastName: 'Doe',
                userRoles: {
                  create: {
                    role: 'USER'
                  }
                },
                hash: await bcrypt.hash('password', 10)
              }
            }
          }
        });
        return request(app.getHttpServer())
          .get('/user-promotion/' + newUserPromotion.id)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('should return 400 if there is no promotion', () => {
        return request(app.getHttpServer())
          .get('/user-promotion/999999')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('should return 200 with object', async () => {
        const loggedUserPromotion = await prisma.userPromotion.create({
          data: {
            promotion: {
              create: {
                title: 'test',
                startDate: new Date(),
                endDate: new Date(),
                carrier: {
                  create: {
                    name: 'test'
                  }
                },
                discount: 10
              }
            },
            user: {
              connect: {
                id: parseInt(jwtDecode(accessToken).sub)
              }
            }
          }
        });
        await request(app.getHttpServer())
          .get('/user-promotion/' + loggedUserPromotion.id)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      });
    });

    describe('POST /user-promotion/use-promotion', () => {
      it('should return 400 if no promotionId provided', async () => {
        return request(app.getHttpServer())
          .post('/user-promotion/use-promotion')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('should return 400 if there is no promotion', async () => {
        const res = await request(app.getHttpServer())
          .post('/user-promotion/use-promotion')
          .send({
            promotionId: 999999
          })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(400);
      });

      it('should return 200', async () => {
        const loggedUserPromotion = await prisma.userPromotion.create({
          data: {
            promotion: {
              create: {
                title: 'test',
                startDate: new Date(),
                endDate: new Date(),
                carrier: {
                  create: {
                    name: 'test'
                  }
                },
                discount: 10
              }
            },
            user: {
              connect: {
                id: parseInt(jwtDecode(accessToken).sub)
              }
            }
          }
        });

        return request(app.getHttpServer())
          .post('/user-promotion/use-promotion')
          .send({
            promotionId: loggedUserPromotion.id
          })
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      });
    });
  });
});
