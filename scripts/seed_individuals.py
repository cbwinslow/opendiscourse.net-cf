from src.models.person import Individual
from src.db.client import save_individual


def main():
    sample = Individual.construct(
        canonical_name="Jane Doe",
        aliases=["J. Doe"],
        social_handles={"x": "@janedoe"},
    ).dict()
    path = save_individual(sample)
    print("Saved sample individual to", path)


if __name__ == '__main__':
    main()
