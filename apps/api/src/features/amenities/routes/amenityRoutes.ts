import { adminMiddleware } from '../../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { createFleetMetadataController } from '../../fleet/controllers/fleetMetadataController.ts';
import { amenityService } from '../services/amenityService.ts';

export const amenityRouter = Router();
const amenityController = createFleetMetadataController(amenityService, {
  basePath: '/api/v1/amenities',
  missingCode: 'AMENITY_NOT_FOUND',
  missingMessage: 'Amenity not found',
});
amenityRouter.use(...adminMiddleware);
amenityRouter.get('/', amenityController.list);
amenityRouter.get('/:id', amenityController.getById);
amenityRouter.post('/', amenityController.create);
amenityRouter.patch('/:id', amenityController.update);
amenityRouter.delete('/:id', amenityController.remove);
