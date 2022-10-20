<template>
  <div v-show="isProductAvailableForBopis">
    <button class="btn btn--full hc-open-bopis-modal" @click="openBopisModal">Pick Up Today</button>
  </div>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import axios from 'axios'
import emitter from './event-bus';
import { bopisModalInstance, isProductProrderedOrBackordered, isProductAvailable } from './bopisPDP';

export default defineComponent({
  name: 'Bopis',
  setup() {
    const currentProduct = ref(null);
    const isProductAvailableForBopis = ref(false);
    const productSku = ref('');

    function openBopisModal (event) {
      // to stop event bubbling when clicking on the Check Stores button
      event.preventDefault();
      event.stopImmediatePropagation();

      bopisModalInstance.isStoreLocatorOpened = true;

      // add overflow style to disable background scroll when modal is opened
      document.getElementsByTagName("body")[0].style.overflow = 'hidden'
    }

    function closeBopisModal (event) {
      // to stop event bubbling when clicking on the Check Stores button
      event.preventDefault();
      event.stopImmediatePropagation();

      bopisModalInstance.isStoreLocatorOpened = false;

      // add overflow style to enable scroll when modal is closed
      document.getElementsByTagName("body")[0].style.overflow = 'scroll'
    }

    async function getCurrentProduct() {
      const product = await axios.get(`${window.location.origin + window.location.pathname}.js`)
      currentProduct.value = product.data
    }

    onMounted(async () => {
      emitter.on('closeBopisModal', closeBopisModal)

      document.getElementsByTagName('body')[0].addEventListener('click', function(event) {
        if (event.target == document.getElementsByClassName('hc-bopis-modal')[0]) {
          closeBopisModal(event);
        }
      })

      if(location.pathname.includes('products')) {
        await getCurrentProduct();
        productSku.value = document.querySelector("input.hc_product_sku").textContent.length > 0 ? document.querySelector("input.hc_product_sku").textContent : document.querySelector("input.hc_product_sku").value;
      }

      isProductAvailableForBopis.value = isProductAvailable(currentProduct.value, productSku.value) ? isProductAvailable(currentProduct.value, productSku.value) : !isProductProrderedOrBackordered(currentProduct.value, productSku.value)
    })

    onUnmounted(() => {
      emitter.off('closeBopisModal', closeBopisModal)
    })

    return {
      closeBopisModal,
      currentProduct,
      openBopisModal,
      isProductAvailableForBopis
    }
  }
});
</script>