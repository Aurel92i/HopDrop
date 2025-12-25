import { Request, Response } from 'express';
import * as packagingService from '../services/packaging.service';

// POST /api/packaging/carrier-confirm
export async function carrierConfirmPackaging(req: Request, res: Response) {
  try {
    const { missionId, photoUrl } = req.body;
    const carrierId = req.user!.id;

    if (!missionId || !photoUrl) {
      return res.status(400).json({ 
        error: 'missionId et photoUrl sont requis' 
      });
    }

    const result = await packagingService.carrierConfirmPackaging(
      missionId,
      carrierId,
      photoUrl
    );

    res.json(result);
  } catch (error: any) {
    console.error('Erreur confirmation emballage livreur:', error);
    res.status(400).json({ error: error.message });
  }
}

// POST /api/packaging/vendor-confirm
export async function vendorConfirmPackaging(req: Request, res: Response) {
  try {
    const { parcelId } = req.body;
    const vendorId = req.user!.id;

    if (!parcelId) {
      return res.status(400).json({ 
        error: 'parcelId est requis' 
      });
    }

    const result = await packagingService.vendorConfirmPackaging(
      parcelId,
      vendorId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Erreur confirmation emballage vendeur:', error);
    res.status(400).json({ error: error.message });
  }
}

// POST /api/packaging/vendor-reject
export async function vendorRejectPackaging(req: Request, res: Response) {
  try {
    const { parcelId, reason } = req.body;
    const vendorId = req.user!.id;

    if (!parcelId || !reason) {
      return res.status(400).json({ 
        error: 'parcelId et reason sont requis' 
      });
    }

    const result = await packagingService.vendorRejectPackaging(
      parcelId,
      vendorId,
      reason
    );

    res.json(result);
  } catch (error: any) {
    console.error('Erreur refus emballage:', error);
    res.status(400).json({ error: error.message });
  }
}

// GET /api/packaging/status/:parcelId
export async function getPackagingStatus(req: Request, res: Response) {
  try {
    const { parcelId } = req.params;
    const userId = req.user!.id;

    const result = await packagingService.getPackagingStatus(parcelId, userId);

    res.json(result);
  } catch (error: any) {
    console.error('Erreur récupération statut emballage:', error);
    res.status(400).json({ error: error.message });
  }
}