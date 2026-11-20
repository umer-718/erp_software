
import BillOfMaterialsForm from "@/components/BillOfMaterialsForm";

export default async function ViewBillOfMaterialsPage({ params }) {
    const { id } = await params;

    return <BillOfMaterialsForm bomId={id} readOnly />;
}
