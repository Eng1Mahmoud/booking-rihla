import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { adminCatalogController } from './adminCatalogController.ts';

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
