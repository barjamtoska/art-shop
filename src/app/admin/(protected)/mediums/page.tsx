import type { Metadata } from "next";
import { AdminForm, TextField } from "@/components/admin/forms";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { createMedium, deleteMedium, updateMedium } from "./actions";

export const metadata: Metadata = { title: "Mediums" };

export default async function MediumsPage() {
  const mediums = await db.medium.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { artworks: true } } },
  });

  return (
    <>
      <PageHeader
        title="Mediums"
        description="The choices in the collection's Medium filter. The exact wording on each placard (“Oil on canvas”) is set on the work itself."
      />
      <ul className="max-w-2xl space-y-6">
        {mediums.map((medium) => (
          <li key={medium.id} className="border border-gold/15 p-5">
            <AdminForm action={updateMedium.bind(null, medium.id)} submitLabel="Rename">
              <TextField
                name="name"
                label={`Name — ${medium._count.artworks} ${medium._count.artworks === 1 ? "work" : "works"}`}
                defaultValue={medium.name}
              />
            </AdminForm>
            {medium._count.artworks === 0 && (
              <div className="mt-4">
                <DeleteButton
                  action={deleteMedium.bind(null, medium.id)}
                  label="Delete"
                  confirmation={`Delete the medium “${medium.name}”?`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="add-medium" className="mt-14 max-w-2xl">
        <h2 id="add-medium" className="mb-5 text-2xl">
          Add a medium
        </h2>
        <AdminForm action={createMedium} submitLabel="Add">
          <TextField name="name" label="Name" placeholder="Watercolour" />
        </AdminForm>
      </section>
    </>
  );
}
