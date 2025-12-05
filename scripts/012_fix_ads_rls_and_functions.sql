-- Créer la fonction RPC pour incrémenter les clics
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ads SET click_count = click_count + 1 WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Autoriser les appels anonymes à cette fonction
GRANT EXECUTE ON FUNCTION increment_ad_clicks(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_ad_clicks(UUID) TO authenticated;

-- Modifier la politique RLS pour permettre la lecture anonyme des pubs actives
DROP POLICY IF EXISTS "Anyone can read active ads" ON ads;
CREATE POLICY "Anyone can read active ads"
  ON ads FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
