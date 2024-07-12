import { INestApplication, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PrismaService extends PrismaClient{
  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get('DATABASE_URL')
        }
      }
    })
  }

  cleanDb() {
    return this.$transaction([
      this.favoriteCarrier.deleteMany(),
      this.userPromotion.deleteMany(),
      this.promotion.deleteMany(),
      this.carrier.deleteMany(),
      this.userRole.deleteMany(),
      this.user.deleteMany(),
    ]);
  }
}
