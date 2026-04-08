-- Allow users to update their own inventory (for quantity changes during crafting)
CREATE POLICY "Users can update their own inventory"
ON public.user_inventory
FOR UPDATE
USING ((auth.uid())::text = (user_id)::text);

-- Allow users to delete their own inventory items (cleanup zero-quantity rows)
CREATE POLICY "Users can delete their own inventory"
ON public.user_inventory
FOR DELETE
USING ((auth.uid())::text = (user_id)::text);