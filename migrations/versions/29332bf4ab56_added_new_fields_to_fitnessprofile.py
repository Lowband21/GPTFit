"""Added new fields to FitnessProfile

Revision ID: 29332bf4ab56
Revises: 166a1fe95370
Create Date: 2023-07-29 16:41:39.592338

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '29332bf4ab56'
down_revision = '166a1fe95370'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('fitness_profile', schema=None) as batch_op:
        batch_op.alter_column('favorite_exercises',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.JSON(),
               existing_nullable=True)
        batch_op.alter_column('equipment',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.JSON(),
               existing_nullable=True)

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('fitness_profile', schema=None) as batch_op:
        batch_op.alter_column('equipment',
               existing_type=sa.JSON(),
               type_=sa.VARCHAR(length=500),
               existing_nullable=True)
        batch_op.alter_column('favorite_exercises',
               existing_type=sa.JSON(),
               type_=sa.VARCHAR(length=500),
               existing_nullable=True)

    # ### end Alembic commands ###
