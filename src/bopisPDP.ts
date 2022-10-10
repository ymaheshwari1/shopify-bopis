import { createApp } from 'vue'
import Bopis from './Bopis.vue'
import BopisModal from './BopisModal.vue'

const bopisModalInstance = createApp(BopisModal).mount('#hc-bopis-app');
const bopisButtonInstance = createApp(Bopis).mount('#hc-bopis-button')

export { bopisButtonInstance, bopisModalInstance }