import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminCatalogController } from '../controllers/adminCatalogController.ts';

export const adminCatalogRouter = Router();
adminCatalogRouter.get(
  '/cities',
  ...adminMiddleware,
  adminCatalogController.cities,
);
adminCatalogRouter.get(
  '/stations',
  ...adminMiddleware,
  adminCatalogController.stations,
);
