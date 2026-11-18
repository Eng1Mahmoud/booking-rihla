import { adminMiddleware } from '../../middlewares/authorizationMiddleware.ts';
import { Router } from 'express';
import { busTypeService } from './busTypeService.ts';
import { createFleetMetadataController } from './fleetMetadataController.ts';

export const busTypeRouter = Router();
const busTypeController = createFleetMetadataController(busTypeService, {
  basePath: '/api/v1/bus-types',
  missingCode: 'BUS_TYPE_NOT_FOUND',
  missingMessage: 'Bus type not found',
});
busTypeRouter.use(...adminMiddleware);
busTypeRouter.get('/', busTypeController.list);
busTypeRouter.get('/:id', busTypeController.getById);
busTypeRouter.post('/', busTypeController.create);
busTypeRouter.patch('/:id', busTypeController.update);
busTypeRouter.delete('/:id', busTypeController.remove);
