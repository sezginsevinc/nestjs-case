import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { UserPromotionService } from "./user-promotion.service";
import { User } from "../auth/decorator";
import { JwtGuard } from "../auth/guard";

@UseGuards(JwtGuard)
@Controller("user-promotion")
export class UserPromotionController {
  constructor(private userPromotionService: UserPromotionService) {
  }

  @Get()
  listPromotion(
    @User("id") userId: number
  ) {
    return this.userPromotionService.listPromotion(userId);
  }

  @Get(":id")
  getPromotion(
    @Param('id') promotionId: number,
    @User("id") userId: number
  ) {
    return this.userPromotionService.getPromotion(promotionId, userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('use-promotion')
  usePromotion(
    @Body("promotionId", ParseIntPipe) promotionId: number,
    @User("id") userId: number
  ) {
    if (!promotionId) {
      throw new BadRequestException("Promotion ID is required");
    }
    return this.userPromotionService.usePromotion(promotionId, userId);
  }
}
