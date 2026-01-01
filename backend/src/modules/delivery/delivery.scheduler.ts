import { DeliveryService } from './delivery.service.js';

const deliveryService = new DeliveryService();

// Intervalle en millisecondes (1 heure)
const CHECK_INTERVAL = 60 * 60 * 1000;

let intervalId: NodeJS.Timeout | null = null;

/**
 * Démarrer le scheduler d'auto-confirmation
 * Vérifie toutes les heures les livraisons en attente dont le délai 12H est dépassé
 */
export function startDeliveryScheduler() {
  console.log('🕐 Scheduler de confirmation de livraison démarré');
  
  // Exécuter immédiatement au démarrage
  runAutoConfirmation();
  
  // Puis toutes les heures
  intervalId = setInterval(runAutoConfirmation, CHECK_INTERVAL);
}

/**
 * Arrêter le scheduler
 */
export function stopDeliveryScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Scheduler de confirmation de livraison arrêté');
  }
}

/**
 * Exécuter le processus d'auto-confirmation
 */
async function runAutoConfirmation() {
  try {
    console.log(`[${new Date().toISOString()}] Vérification des livraisons en attente...`);
    
    const result = await deliveryService.autoConfirmExpiredDeliveries();
    
    if (result.processed > 0) {
      console.log(`✅ ${result.processed} livraison(s) auto-confirmée(s)`);
      result.results.forEach((r) => {
        console.log(`   - Mission ${r.missionId}: ${r.status}`);
      });
    } else {
      console.log('   Aucune livraison à auto-confirmer');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'auto-confirmation:', error);
  }
}

/**
 * Alternative: Utiliser node-cron pour plus de précision
 * 
 * import cron from 'node-cron';
 * 
 * // Toutes les heures à la minute 0
 * cron.schedule('0 * * * *', async () => {
 *   await runAutoConfirmation();
 * });
 */
