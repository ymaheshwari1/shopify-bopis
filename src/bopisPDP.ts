import { createApp } from 'vue'
import Bopis from './Bopis.vue'
import BopisModal from './BopisModal.vue'

const isProductProrderedOrBackordered = function (product: any, variantSku: string) {
  console.log('product', product)
  if (product.tags.includes('HC:Pre-Order') || product.tags.includes('HC:Backorder')) {
    return product.variants.find((variant: any) => variant.sku == variantSku).inventory_policy === 'continue'
  }
  return false;
}

const isProductAvailable = async function (product: any, variantSku: string) {
  const hasInventoryOnShopify = +(document.querySelector("input.hc_inventory") as HTMLInputElement).value > 0
  return !!product && (hasInventoryOnShopify || product.variants.find((variant: any) => variant.sku == variantSku).inventory_policy === 'continue')
}

function getDay () {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const date = new Date();
  return days[date.getDay()];
}

function openData (regularHours: any) {
  return regularHours.periods.find((period: any) => period.openDay === getDay());
}

function tConvert (time: any) {
  if (time) {
    // Check correct time format and split into components
    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];

    if (time.length > 1) { // If time format correct
      time = time.slice(1); // Remove full string match value
      time[5] = +time[0] < 12 ? 'am' : 'pm'; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join(''); // return adjusted time or original string
  }
}

const bopisModalApp = createApp(BopisModal);
const bopisButtonApp = createApp(Bopis);

const bopisModalInstance = bopisModalApp.mount('#hc-bopis-app');
const bopisButtonInstance = bopisButtonApp.mount('#hc-bopis-button')

export { bopisButtonInstance, bopisModalInstance, isProductProrderedOrBackordered, isProductAvailable, openData, tConvert }