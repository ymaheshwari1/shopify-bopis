import { createApp } from 'vue'
import Bopis from './Bopis.vue'
import BopisModal from './BopisModal.vue'

const isProductProrderedOrBackordered = function (product: any, variantId: string) {
  console.log('product', product)
  if (product.tags.includes('HC:Pre-Order') || product.tags.includes('HC:Backorder')) {
    return product.variants.find((variant: any) => variant.id == variantId).inventory_policy === 'continue'
  }
  return false;
}

const bopisModalApp = createApp(BopisModal);
const bopisButtonApp = createApp(Bopis);

const bopisModalInstance = bopisModalApp.mount('#hc-bopis-app');
const bopisButtonInstance = bopisButtonApp.mount('#hc-bopis-button')

export { bopisButtonInstance, bopisModalInstance, isProductProrderedOrBackordered }