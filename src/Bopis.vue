<template>
  <div>
    <button v-show="isProductAvailableForBopis" class="btn btn--full hc-open-bopis-modal" @click="openBopisModal">Pick Up Today</button>
    <div id="hc-backdrop" v-show="isStoreLocatorOpened" />
    <StoreLocator ref="hcStoreLocator" v-show="isStoreLocatorOpened"/>
  </div>
</template>

<script>
import { defineComponent, onMounted, ref } from 'vue';
import StoreLocator from '@/components/StoreLocator.vue'
import axios from 'axios'

export default defineComponent({
  name: 'Bopis',
  components: {
    StoreLocator
  },
  setup() {
    const isStoreLocatorOpened = ref(false);
    const currentProduct = ref(null);
    const isProductAvailableForBopis = ref(false);
    const productId = ref('');

    function openBopisModal (event) {
      // to stop event bubbling when clicking on the Check Stores button
      event.preventDefault();
      event.stopImmediatePropagation();

      isStoreLocatorOpened.value = true;

      // add overflow style to disable background scroll when modal is opened
      document.getElementsByTagName("body")[0].style.overflow = 'hidden'
    }

    function closeBopisModal (event) {
      // to stop event bubbling when clicking on the Check Stores button
      event.preventDefault();
      event.stopImmediatePropagation();

      isStoreLocatorOpened.value = false;

      // add overflow style to disable background scroll when modal is opened
      document.getElementsByTagName("body")[0].style.overflow = 'scroll'
    }

    async function getCurrentProduct() {
      console.log(window.location.origin + window.location.pathname)
      const product = await axios.get(`${window.location.origin + window.location.pathname}.js`)
      currentProduct.value = product.data
    }

    function isProductProrderedOrBackordered (variantId) {
      console.log(currentProduct.value, variantId, 'currentProduct.value')
      if (currentProduct.value.tags.includes('HC:Pre-Order') || currentProduct.value.tags.includes('HC:Backorder')) {
        return currentProduct.value.variants.find((variant) => variant.id == variantId.value).inventory_policy === 'continue'
      }
      return false;
    }

    onMounted(async () => {

      console.log('app mounted');
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

    return {
      closeBopisModal,
      openBopisModal,
      isProductAvailableForBopis,
      isStoreLocatorOpened
    }
  }
});
</script>