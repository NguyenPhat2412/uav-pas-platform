'use client';

import {PageGuard} from '@/components/customer/CustomerLayout';
import {CustomerShopCatalogView} from '@/components/marketplace/shop/CustomerShopCatalogView';

export default function ServicesPage() {
    return (
        <PageGuard>
            <CustomerShopCatalogView/>
        </PageGuard>
    );
}
