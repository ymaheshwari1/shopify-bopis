<template>
  <div>
    <button v-show="isProductAvailableForBopis" class="btn btn--full hc-open-bopis-modal" @click="openBopisModal">Pick Up Today</button>
  </div>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import axios from 'axios'
import emitter from './event-bus';
import { bopisModalInstance } from './bopisPDP';

export default defineComponent({
  name: 'Bopis',
  setup() {
    const currentProduct = ref(null);
    const isProductAvailableForBopis = ref(false);
    const productId = ref('');

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

      // add overflow style to disable background scroll when modal is opened
      document.getElementsByTagName("body")[0].style.overflow = 'scroll'
    }

    async function getCurrentProduct() {
      const product = await axios.get(`${window.location.origin + window.location.pathname}.js`)
      currentProduct.value = product.data
    }

    function isProductProrderedOrBackordered (variantId) {
      if (currentProduct.value.tags.includes('HC:Pre-Order') || currentProduct.value.tags.includes('HC:Backorder')) {
        return currentProduct.value.variants.find((variant) => variant.id == variantId.value).inventory_policy === 'continue'
      }
      return false;
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

        // const cartForm = document.getElementsByClassName("hc-product-form")[0];
        // console.log('cartForm', JSON.stringify(cartForm))
        productId.value = document.getElementsByName('id')[0].value;
      }

      if(!isProductProrderedOrBackordered(productId)) {
        isProductAvailableForBopis.value = true
      }
    })

    onUnmounted(() => {
      emitter.off('closeBopisModal', closeBopisModal)
    })

    return {
      closeBopisModal,
      openBopisModal,
      isProductAvailableForBopis
    }
  }
});
</script>