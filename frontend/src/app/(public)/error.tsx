'use client';
import {Button} from "@/components/shared";

export default function ErrorPage({reset}: { reset: () => void }) {
    return <section className="subhero">
        <div className="shell"><h1>Không thể tải trang này.</h1><p>Vui lòng thử lại hoặc quay về trang chủ.</p><Button
            className="button" onClick={reset}>Thử lại</Button><a className="button button-quiet" href="/">Trang chủ</a>
        </div>
    </section>;
}
