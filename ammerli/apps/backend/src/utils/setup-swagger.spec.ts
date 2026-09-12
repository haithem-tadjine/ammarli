import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import setupSwagger from './setup-swagger';

jest.mock('@scalar/nestjs-api-reference', () => ({
  apiReference: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('setupSwagger', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'app.name') return 'TestApp';
              if (key === 'app.url') return 'http://localhost:3000';
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configService = moduleRef.get<ConfigService>(ConfigService);
    jest.spyOn(app, 'get').mockImplementation((service) => {
      if (service === ConfigService) return configService;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call ConfigService with correct parameters', () => {
    setupSwagger(app, 'api');
    expect(configService.getOrThrow).toHaveBeenCalledWith('app.name', {
      infer: true,
    });
  });

  it('should call SwaggerModule.createDocument with correct parameters', () => {
    const createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument');
    setupSwagger(app, 'api');
    expect(createDocumentSpy).toHaveBeenCalled();
  });

  it('should call SwaggerModule.setup with correct parameters', () => {
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');
    setupSwagger(app, 'api');
    expect(setupSpy).toHaveBeenCalledWith('api/api-docs', app, expect.any(Object), {
      customSiteTitle: 'TestApp',
    });
  });
});
